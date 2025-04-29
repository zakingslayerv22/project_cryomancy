"use client";

import { config } from "@/config";
import "@solana/wallet-adapter-react-ui/styles.css";
import React, { useState, useEffect, useRef } from "react";
import {
  Container,
  Box,
  Button,
  Typography,
  Grid,
  TextField,
  Paper,
  Alert,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Switch,
  FormControlLabel,
  IconButton,
  Avatar,
  Popover,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import SellIcon from "@mui/icons-material/Sell";
import PowerSettingsNewIcon from "@mui/icons-material/PowerSettingsNew";

import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";
import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";

// ===== New Imports for Borsh decoding =====
import { struct, u8, u64, publicKey } from "@project-serum/borsh";
import { AccountLayout } from "@solana/spl-token";

// ===== Define Raydium Pool Layout (V4) =====
// This layout describes the binary structure of a Raydium liquidity pool account.
// Extend with additional fields as required.
const RaydiumPoolLayout = struct([
  u8("status"),
  u8("nonce"),
  publicKey("baseMint"),
  publicKey("quoteMint"),
  publicKey("lpMint"),
  publicKey("baseVault"),
  publicKey("quoteVault"),
  publicKey("marketId"),
  u64("baseDecimals"),
  u64("quoteDecimals"),
  // ... include other fields as needed
]);

// QuickNode endpoints for HTTP and WebSocket
// const QUICKNODE_HTTP_ENDPOINT = process.env.NEXT_PUBLIC_QUICKNODE_HTTP_ENDPOINT;
// const QUICKNODE_WS_ENDPOINT = process.env.NEXT_PUBLIC_QUICKNODE_WS_ENDPOINT;

// Raydium program public key
const RAYDIUM_PROGRAM_ID = new PublicKey(
  "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8"
);

// Use a regex to match multiple candidate pool creation instruction names.
const POOL_CREATION_REGEX = /(?:init_pool|initialize2|create_pool)/i;

export default function TradeDashboard() {
  // Mounting state
  const [mounted, setMounted] = useState(false);

  // Trade parameters
  const [amountToBuy, setAmountToBuy] = useState("");
  const [maxTrades, setMaxTrades] = useState("");
  const [buyingMarketCap, setBuyingMarketCap] = useState("");
  const [sellingMarketCap, setSellingMarketCap] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [slippage, setSlippage] = useState("");
  const [priorityFee, setPriorityFee] = useState("");

  // Toggle switches
  const [checkTwitter, setCheckTwitter] = useState(false);
  const [checkTelegram, setCheckTelegram] = useState(false);
  const [checkWebsite, setCheckWebsite] = useState(false);

  // Trade statistics (placeholder values)
  const [winningTrades, setWinningTrades] = useState({
    count: 20,
    percentage: 50,
  });
  const [stopLossTrades, setStopLossTrades] = useState({
    count: 5,
    percentage: 25,
  });
  const [breakEvenTrades, setBreakEvenTrades] = useState({
    count: 10,
    percentage: 50,
  });

  // Total Profit and Loss
  const [totalProfit, setTotalProfit] = useState("20.2 SOL");
  const [totalLoss, setTotalLoss] = useState("10.0 SOL");

  // Table data placeholders
  const allTokens = [
    {
      sn: 1,
      name: "TokenA",
      marketCap: "100",
      currentMarketCap: "110",
      symbol: "TKA",
      tx: "tx123",
      pump: "Yes",
    },
  ];
  const qualifiedTokens = [
    {
      sn: 1,
      name: "TokenB",
      marketCap: "150",
      currentMarketCap: "160",
      symbol: "TKB",
      tx: "tx456",
      pump: "No",
    },
  ];
  const ongoingTrades = [
    {
      sn: 1,
      name: "TokenC",
      marketCap: "200",
      currentMarketCap: "210",
      symbol: "TKC",
      tx: "tx789",
      pump: "Yes",
    },
  ];
  const tradingHistory = [
    {
      sn: 1,
      name: "TokenD",
      buyingMarketCap: "120",
      sellingMarketCap: "130",
      tx: "tx321",
      result: "Profit",
    },
  ];

  // New pools state for Raydium new liquidity pools
  const [newPools, setNewPools] = useState([]);

  // Server status
  const [serverConnected, setServerConnected] = useState(true);

  // Emergency sell field
  const [emergencyMint, setEmergencyMint] = useState("");

  // Trading state
  const [tradingStarted, setTradingStarted] = useState(false);

  // Timer state
  const [timerCount, setTimerCount] = useState(0);

  // Wallet balance (real-time updated)
  const [walletBalance, setWalletBalance] = useState("10.00 SOL");

  // Measurement mode state: "SOL" or "%"
  const [measurementMode, setMeasurementMode] = useState("SOL");

  // Profile menu state
  const [profileAnchorEl, setProfileAnchorEl] = useState(null);

  // Refs for autoscroll
  const statsRef = useRef(null);

  const { publicKey, connected, disconnect } = useWallet();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Timer effect: update every second when trading has started
  useEffect(() => {
    let interval = null;
    if (tradingStarted) {
      interval = setInterval(() => {
        setTimerCount((prev) => prev + 1);
      }, 1000);
    } else {
      setTimerCount(0);
    }
    return () => clearInterval(interval);
  }, [tradingStarted]);

  // Real-time wallet balance update using QuickNode HTTP endpoint
  useEffect(() => {
    if (connected && publicKey) {
      const connection = new Connection(QUICKNODE_HTTP_ENDPOINT);
      connection.getBalance(publicKey).then((lamports) => {
        setWalletBalance((lamports / LAMPORTS_PER_SOL).toFixed(2) + " SOL");
      });
      const subscriptionId = connection.onAccountChange(
        publicKey,
        (accountInfo) => {
          setWalletBalance(
            (accountInfo.lamports / LAMPORTS_PER_SOL).toFixed(2) + " SOL"
          );
        }
      );
      return () => connection.removeAccountChangeListener(subscriptionId);
    }
  }, [connected, publicKey]);

  // ===== New useEffect: Listen to Raydium logs for pool initialization =====
  useEffect(() => {
    const connectionWs = new Connection(config.QUICKNODE_HTTP_ENDPOINT, {
      wsEndpoint: config.QUICKNODE_WS_ENDPOINT,
    });

    const logSubId = connectionWs.onLogs(
      RAYDIUM_PROGRAM_ID,
      async (logInfo) => {
        if (logInfo.err) return;

        // Check for pool initialization logs using a few possible instruction names.
        if (logInfo.logs.some((log) => POOL_CREATION_REGEX.test(log))) {
          try {
            // Fetch transaction details with proper checks using optional chaining.
            const tx = await connectionWs.getTransaction(logInfo.signature, {
              maxSupportedTransactionVersion: 0,
              commitment: "confirmed",
            });

            // Safeguard: Ensure that tx, tx.transaction, and tx.transaction.message.accountKeys exist.
            const accountKeys = tx?.transaction?.message?.accountKeys;
            if (!accountKeys) {
              console.warn(
                "Account keys undefined for transaction:",
                logInfo.signature
              );
              return;
            }

            // Extract pool account using find on accountKeys.
            const poolAccount = accountKeys.find(
              (key) => key.toString() === RAYDIUM_PROGRAM_ID.toString()
            );

            if (poolAccount) {
              const poolInfo = await connectionWs.getAccountInfo(poolAccount);
              if (poolInfo) {
                const poolData = RaydiumPoolLayout.decode(poolInfo.data);

                setNewPools((prev) => [
                  ...prev,
                  {
                    lpSignature: logInfo.signature,
                    lpAddress: poolAccount.toString(),
                    tokenAddress: poolData.baseMint.toString(),
                    quoteAddress: poolData.quoteMint.toString(),
                    exchange: "Raydium",
                    timestamp: new Date().toISOString(),
                  },
                ]);
              }
            }
          } catch (error) {
            console.error("Error processing transaction:", error);
          }
        }
      },
      "confirmed"
    );

    return () => connectionWs.removeOnLogsListener(logSubId);
  }, []);

  // ===== New useEffect: Monitor program account changes with filters =====
  useEffect(() => {
    const connectionWs = new Connection(config.QUICKNODE_HTTP_ENDPOINT, {
      wsEndpoint: config.QUICKNODE_WS_ENDPOINT,
    });

    // Filters: dataSize set to 648 (updated size for Raydium V4 pools)
    // and a memcmp filter at offset 8 with bytes "D" to help identify initialized pool accounts.
    const accountSubId = connectionWs.onProgramAccountChange(
      RAYDIUM_PROGRAM_ID,
      async (accountInfo) => {
        try {
          const poolData = RaydiumPoolLayout.decode(accountInfo.account.data);

          setNewPools((prev) => {
            const exists = prev.some(
              (pool) => pool.lpAddress === accountInfo.accountId.toString()
            );

            if (!exists) {
              return [
                ...prev,
                {
                  lpSignature: "Live Update",
                  lpAddress: accountInfo.accountId.toString(),
                  tokenAddress: poolData.baseMint.toString(),
                  quoteAddress: poolData.quoteMint.toString(),
                  exchange: "Raydium",
                  timestamp: new Date().toISOString(),
                },
              ];
            }
            return prev;
          });
        } catch (error) {
          console.error("Error decoding pool account:", error);
        }
      },
      "confirmed",
      [{ dataSize: 648 }, { memcmp: { offset: 8, bytes: "D" } }]
    );

    return () => {
      connectionWs.removeProgramAccountChangeListener(accountSubId);
    };
  }, []);

  // Toggle profile popover
  const handleProfileClick = (event) => {
    setProfileAnchorEl(profileAnchorEl ? null : event.currentTarget);
  };
  const profileMenuOpen = Boolean(profileAnchorEl);

  // Toggle measurement mode handler
  const handleMeasurementModeChange = (event, newMode) => {
    if (newMode !== null) {
      setMeasurementMode(newMode);
    }
  };

  // Recommended settings
  const setRecommendedSettings = () => {
    setAmountToBuy("1");
    setMaxTrades("3");
    setBuyingMarketCap("50");
    setSellingMarketCap("100");
    setStopLoss("5");
    setSlippage("0.5");
    setPriorityFee("0.00005");
  };

  // Disable Start Trading until required fields are filled
  const requiredFieldsFilled =
    amountToBuy &&
    maxTrades &&
    buyingMarketCap &&
    sellingMarketCap &&
    stopLoss &&
    slippage &&
    priorityFee;

  // Start Trading
  const handleStartTrading = () => {
    console.log("Starting trading with settings:", {
      amountToBuy,
      maxTrades,
      buyingMarketCap,
      sellingMarketCap,
      stopLoss,
      slippage,
      priorityFee,
      socialChecks: { checkTwitter, checkTelegram, checkWebsite },
      measurementMode,
    });
    setTradingStarted(true);
    statsRef.current?.scrollIntoView({ behavior: "smooth" });
    // Insert trading logic here...
  };

  // Sell function for ongoing trades
  const handleSellTrade = (trade) => {
    console.log("Selling trade for:", trade);
    // Insert sell logic here...
  };

  // Emergency sell function
  const handleEmergencySell = () => {
    console.log("Emergency Sell for token mint:", emergencyMint);
    // Insert emergency sell logic here...
  };

  // Shutdown
  const handleShutdown = () => {
    console.log("Shutdown: Selling all open positions and disconnecting.");
    // Insert shutdown logic here...
    disconnect();
  };

  if (!mounted) return null;

  return (
    <Container maxWidth="lg" sx={{ py: 2, px: 1 }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography
          variant="subtitle1"
          sx={{ fontSize: "1rem", fontWeight: 600 }}
        >
          Trading Dashboard
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {connected && (
            <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
              Balance: {walletBalance}
            </Typography>
          )}
          <IconButton onClick={handleProfileClick} size="small">
            <Avatar alt="Profile" src="/profile.jpg" />
          </IconButton>
          <Popover
            open={profileMenuOpen}
            anchorEl={profileAnchorEl}
            onClose={() => setProfileAnchorEl(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            disableRestoreFocus
            PaperProps={{ sx: { p: 1 } }}
          >
            <Box>
              <Button fullWidth sx={{ textTransform: "none" }}>
                Trade History
              </Button>
              <Button fullWidth sx={{ textTransform: "none" }}>
                Settings
              </Button>
              <Button
                fullWidth
                sx={{ textTransform: "none", color: "error.main" }}
              >
                Logout
              </Button>
            </Box>
          </Popover>
        </Box>
      </Box>

      {/* Server Status */}
      <Box sx={{ mb: 1, textAlign: "center" }}>
        <Alert
          severity={serverConnected ? "success" : "error"}
          variant="filled"
        >
          Server {serverConnected ? "Connected" : "Disconnected"}
        </Alert>
      </Box>

      {/* Measurement Mode Toggle */}
      <Box sx={{ mb: 2, textAlign: "center" }}>
        <ToggleButtonGroup
          color="primary"
          value={measurementMode}
          exclusive
          onChange={handleMeasurementModeChange}
        >
          <ToggleButton value="SOL">Measure by SOL</ToggleButton>
          <ToggleButton value="%">Measure by %</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Trade Form */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="caption" sx={{ color: "error.main" }}>
          * All fields marked with an asterisk are compulsory.
        </Typography>
        <Grid container spacing={1} sx={{ mt: 1 }}>
          {/* Row 1: Three fields */}
          <Grid item xs={12} sm={4}>
            <TextField
              label={
                measurementMode === "SOL" ? "Amount (SOL) *" : "Amount (%) *"
              }
              variant="outlined"
              type="number"
              size="small"
              fullWidth
              disabled={tradingStarted}
              value={amountToBuy}
              onChange={(e) => setAmountToBuy(e.target.value)}
              helperText={
                measurementMode === "%" ? "Percentage of wallet balance" : ""
              }
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Max Trades *"
              variant="outlined"
              type="number"
              size="small"
              fullWidth
              disabled={tradingStarted}
              value={maxTrades}
              onChange={(e) => setMaxTrades(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Buying Cap (SOL) *"
              variant="outlined"
              type="number"
              size="small"
              fullWidth
              disabled={tradingStarted}
              value={buyingMarketCap}
              onChange={(e) => setBuyingMarketCap(e.target.value)}
            />
          </Grid>
          {/* Row 2 */}
          <Grid item xs={12} sm={4}>
            <TextField
              label={
                measurementMode === "SOL"
                  ? "Selling Cap (SOL) *"
                  : "Selling Cap (%) *"
              }
              variant="outlined"
              type="number"
              size="small"
              fullWidth
              disabled={tradingStarted}
              value={sellingMarketCap}
              onChange={(e) => setSellingMarketCap(e.target.value)}
              helperText={
                measurementMode === "%" ? "Percentage of Buying Cap" : ""
              }
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label={
                measurementMode === "SOL"
                  ? "Stop Loss (SOL) *"
                  : "Stop Loss (%) *"
              }
              variant="outlined"
              type="number"
              size="small"
              fullWidth
              disabled={tradingStarted}
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              helperText={
                measurementMode === "%" ? "Percentage of Buying Cap" : ""
              }
            />
          </Grid>
          {/* Row 3 */}
          <Grid item xs={12} sm={4}>
            <TextField
              label="Slippage (%) *"
              variant="outlined"
              type="number"
              size="small"
              fullWidth
              disabled={tradingStarted}
              value={slippage}
              onChange={(e) => setSlippage(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Priority Fee (SOL) *"
              variant="outlined"
              type="number"
              size="small"
              fullWidth
              disabled={tradingStarted}
              value={priorityFee}
              onChange={(e) => setPriorityFee(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={4} container alignItems="center">
            <Button
              variant="contained"
              onClick={setRecommendedSettings}
              fullWidth
              size="small"
              disabled={tradingStarted}
            >
              Recommended
            </Button>
          </Grid>
          {/* Toggle switches */}
          <Grid item xs={12}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={checkTwitter}
                    onChange={() => setCheckTwitter(!checkTwitter)}
                    disabled={tradingStarted}
                  />
                }
                label="Twitter"
              />
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={checkTelegram}
                    onChange={() => setCheckTelegram(!checkTelegram)}
                    disabled={tradingStarted}
                  />
                }
                label="Telegram"
              />
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={checkWebsite}
                    onChange={() => setCheckWebsite(!checkWebsite)}
                    disabled={tradingStarted}
                  />
                }
                label="Website"
              />
            </Box>
          </Grid>
          {/* Start Trading Button */}
          <Grid item xs={12}>
            <Button
              variant="contained"
              onClick={handleStartTrading}
              fullWidth
              size="small"
              disabled={!requiredFieldsFilled || tradingStarted}
            >
              Start Trading
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Controls: Timer, Emergency Sell & Shutdown */}
      <Box sx={{ mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <Typography
              variant="subtitle2"
              align="center"
              sx={{ fontWeight: "bold" }}
            >
              Trade Timer: {timerCount} s
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" align="center" sx={{ mb: 1 }}>
              Emergency Sell
            </Typography>
            <Grid container spacing={1} alignItems="center">
              <Grid item xs={8}>
                <TextField
                  label="Token Mint"
                  variant="outlined"
                  size="small"
                  fullWidth
                  value={emergencyMint}
                  onChange={(e) => setEmergencyMint(e.target.value)}
                />
              </Grid>
              <Grid item xs={4}>
                <Button
                  variant="contained"
                  color="error"
                  onClick={handleEmergencySell}
                  fullWidth
                  size="small"
                >
                  Sell
                </Button>
              </Grid>
            </Grid>
          </Grid>
          <Grid item xs={12} md={4} sx={{ textAlign: "center" }}>
            <Button
              variant="contained"
              color="error"
              onClick={handleShutdown}
              sx={{
                borderRadius: "50%",
                width: 50,
                height: 50,
                minWidth: "unset",
              }}
            >
              <PowerSettingsNewIcon />
            </Button>
          </Grid>
        </Grid>
      </Box>

      {/* Trade Statistics */}
      <Box ref={statsRef} sx={{ mb: 2 }}>
        <Grid container spacing={1} justifyContent="center">
          <Grid item xs={4}>
            <Paper
              sx={{
                p: 1,
                textAlign: "center",
                backgroundColor: "green",
                color: "white",
                fontWeight: "bold",
              }}
            >
              <Typography variant="subtitle2">Winning</Typography>
              <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                {totalProfit}
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: "bold" }}>
                {winningTrades.count} ({winningTrades.percentage}%)
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={4}>
            <Paper
              sx={{
                p: 1,
                textAlign: "center",
                backgroundColor: "red",
                color: "white",
                fontWeight: "bold",
              }}
            >
              <Typography variant="subtitle2">Stop Loss</Typography>
              <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                {totalLoss}
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: "bold" }}>
                {stopLossTrades.count} ({stopLossTrades.percentage}%)
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={4}>
            <Paper
              sx={{
                p: 1,
                textAlign: "center",
                backgroundColor: "#f57c00",
                color: "white",
                fontWeight: "bold",
              }}
            >
              <Typography variant="subtitle2">Break Even</Typography>
              <Typography variant="caption">
                {breakEvenTrades.count} ({breakEvenTrades.percentage}%)
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* New Pools Table */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          New Raydium Pools
        </Typography>
        <Paper sx={{ p: 1 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>LP Signature</TableCell>
                <TableCell>LP Address</TableCell>
                <TableCell>Token Address</TableCell>
                <TableCell>Quote Address</TableCell>
                <TableCell>Exchange</TableCell>
                <TableCell>Timestamp</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {newPools.map((pool) => (
                <TableRow key={pool.lpSignature}>
                  <TableCell>{pool.lpSignature}</TableCell>
                  <TableCell>{pool.lpAddress}</TableCell>
                  <TableCell>{pool.tokenAddress}</TableCell>
                  <TableCell>{pool.quoteAddress}</TableCell>
                  <TableCell>{pool.exchange}</TableCell>
                  <TableCell>{pool.timestamp}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      </Box>

      {/* Existing Tables Section */}
      <Box>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ border: "1px solid #ccc", p: 1, mb: 2 }}>
              <Typography variant="subtitle2">All Tokens</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>SN</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Cap</TableCell>
                    <TableCell>Cur. Cap</TableCell>
                    <TableCell>Symbol</TableCell>
                    <TableCell>Tx</TableCell>
                    <TableCell>Pump</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {allTokens.map((token) => (
                    <TableRow key={token.sn}>
                      <TableCell>{token.sn}</TableCell>
                      <TableCell>{token.name}</TableCell>
                      <TableCell>{token.marketCap}</TableCell>
                      <TableCell>{token.currentMarketCap}</TableCell>
                      <TableCell>{token.symbol}</TableCell>
                      <TableCell>{token.tx}</TableCell>
                      <TableCell>{token.pump}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ border: "1px solid #ccc", p: 1, mb: 2 }}>
              <Typography variant="subtitle2">Qualified Tokens</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>SN</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Cap</TableCell>
                    <TableCell>Cur. Cap</TableCell>
                    <TableCell>Symbol</TableCell>
                    <TableCell>Tx</TableCell>
                    <TableCell>Pump</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {qualifiedTokens.map((token) => (
                    <TableRow key={token.sn}>
                      <TableCell>{token.sn}</TableCell>
                      <TableCell>{token.name}</TableCell>
                      <TableCell>{token.marketCap}</TableCell>
                      <TableCell>{token.currentMarketCap}</TableCell>
                      <TableCell>{token.symbol}</TableCell>
                      <TableCell>{token.tx}</TableCell>
                      <TableCell>{token.pump}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper sx={{ border: "1px solid #ccc", p: 1, mb: 2 }}>
              <Typography variant="subtitle2">Ongoing Trades</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>SN</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Cap</TableCell>
                    <TableCell>Cur. Cap</TableCell>
                    <TableCell>Symbol</TableCell>
                    <TableCell>Tx</TableCell>
                    <TableCell>Pump</TableCell>
                    <TableCell align="center">Sell</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ongoingTrades.map((trade) => (
                    <TableRow key={trade.sn}>
                      <TableCell>{trade.sn}</TableCell>
                      <TableCell>{trade.name}</TableCell>
                      <TableCell>{trade.marketCap}</TableCell>
                      <TableCell>{trade.currentMarketCap}</TableCell>
                      <TableCell>{trade.symbol}</TableCell>
                      <TableCell>{trade.tx}</TableCell>
                      <TableCell>{trade.pump}</TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={() => handleSellTrade(trade)}
                          title="Sell Trade"
                          color="error"
                        >
                          <SellIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper sx={{ border: "1px solid #ccc", p: 1 }}>
              <Typography variant="subtitle2">Trading History</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>SN</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Buy Cap</TableCell>
                    <TableCell>Sell Cap</TableCell>
                    <TableCell>Tx</TableCell>
                    <TableCell>Result</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tradingHistory.map((trade) => (
                    <TableRow key={trade.sn}>
                      <TableCell>{trade.sn}</TableCell>
                      <TableCell>{trade.name}</TableCell>
                      <TableCell>{trade.buyingMarketCap}</TableCell>
                      <TableCell>{trade.sellingMarketCap}</TableCell>
                      <TableCell>{trade.tx}</TableCell>
                      <TableCell>{trade.result}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* Wallet Connection */}
      <Box sx={{ mt: 2, textAlign: "center" }}>
        <WalletMultiButton />
        {connected && (
          <Button
            variant="outlined"
            onClick={disconnect}
            sx={{ ml: 1 }}
            size="small"
          >
            Disconnect
          </Button>
        )}
      </Box>
    </Container>
  );
}
