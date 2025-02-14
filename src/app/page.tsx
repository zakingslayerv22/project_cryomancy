"use client";

import "@solana/wallet-adapter-react-ui/styles.css";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Container, Box, Button, Typography } from "@mui/material";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";

export default function Home() {
  const { connected, publicKey, disconnect } = useWallet();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // Set mounted flag after component mounts (client-side)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Optionally, you can auto-redirect once connected.
  useEffect(() => {
    if (mounted && connected) {
      // router.push("/trade");
    }
  }, [mounted, connected, router]);

  // Until mounted, render nothing to avoid hydration mismatches.
  if (!mounted) return null;

  return (
    <div suppressHydrationWarning={true}>
      <Container
        maxWidth="sm"
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          textAlign: "center",
        }}
      >
        <Box sx={{ mb: 4 }}>
          <Image
            src="/bot-logo.png" // Replace with your bot logo path
            alt="Bot Logo"
            width={180}
            height={180}
            priority
          />
        </Box>
        {/* If not connected, show wallet connection button */}
        {!connected ? (
          <Box sx={{ mb: 2 }}>
            <WalletMultiButton />
          </Box>
        ) : (
          // If connected, show wallet info and trading actions
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1">
              Connected: {publicKey?.toBase58().slice(0, 6)}...
              {publicKey?.toBase58().slice(-4)}
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={() => router.push("/trade")}
              sx={{ mt: 2 }}
            >
              Start Trading
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              onClick={disconnect}
              sx={{ mt: 2, ml: 2 }}
            >
              Disconnect
            </Button>
          </Box>
        )}
      </Container>
    </div>
  );
}
