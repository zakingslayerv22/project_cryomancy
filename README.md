This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

You could also consider using WebSockets (via onLogs or getProgramAccounts) for a more event‑driven solution if required.

We'll use WebSockets then. Before that, there are a few changes I intend to make with the UI/UX. As the UI is now, people can type the Amount (SOL), Selling cap(Sol)? What if there were a toggle button, where the two sides of the toggle would be "Measure by %" and "Measure by SOL". When the user toggles to Measure by %, the Amount, Selling Cap and Stop loss change to %. When the user toggles to Measure by SOL, the Amount, Selling Cap and Stop loss change to SOL. So the user can choose if he wants the bot to function like that in SOL or %.
The percentage of the Amount will be from his total wallet balance (change the field name accordingly), the selling market cap and stop loss will be calculated from the Buying Market cap.

You have the code. go ahead and achieve that.

First of all remove the token holdings field and re adjust the UI accordingly

Secondly why are you using this endpoint?

"https://docs-demo.solana-mainnet.quiknode.pro/new-pools"
196 | );

> 197 | if (!res.ok) throw new Error("Network response was not ok");

Isnt this a demo? I will have to furnish you with my real API details?

fix(config): centralize QuickNode env vars for maintainability
Centralized all QuickNode-related environment variables into a config file
for better scalability, readability, and type safety across the app.

- Created src/config/index.ts to manage env vars
- Added type interfaces for validation
- Throws errors on missing required env vars
- Supports both public (NEXT*PUBLIC*\*) and future server-only vars

This refactor will make it easier to manage additional endpoints or API
keys as the app grows and improves DX (developer experience).

Related: resolves setup issues due to Prettier formatting .env files
