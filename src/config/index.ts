// Define types for all required environment variables
interface PublicRuntimeEnv {
  QUICKNODE_HTTP_ENDPOINT: string;
  QUICKNODE_WS_ENDPOINT: string;
}

interface ServerRuntimeEnv {
  SECRET_API_KEY?: string; // Optional for now
}

// Read and validate public env vars
const publicEnv: PublicRuntimeEnv = {
  QUICKNODE_HTTP_ENDPOINT: process.env.NEXT_PUBLIC_QUICKNODE_HTTP_ENDPOINT!,
  QUICKNODE_WS_ENDPOINT: process.env.NEXT_PUBLIC_QUICKNODE_WS_ENDPOINT!,
};

// Read server-only vars if needed
const serverEnv: ServerRuntimeEnv = {
  SECRET_API_KEY: process.env.SECRET_API_KEY,
};

// Validate required public vars
for (const [key, value] of Object.entries(publicEnv)) {
  if (!value || value.trim() === "") {
    throw new Error(`❌ Missing environment variable: ${key}`);
  }
}

export const config = {
  ...publicEnv,
  ...serverEnv,
};
