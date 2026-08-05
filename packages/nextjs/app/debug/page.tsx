import type { NextPage } from "next";
import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";
import { DebugContracts } from "./_components/DebugContracts";

export const metadata = getMetadata({
  title: "Debug Contracts",
  description: "Debug your deployed 🏗 Scaffold-Stylus contracts in an easy way",
});

const Debug: NextPage = () => {
  return <DebugContracts />;
};

export default Debug;
