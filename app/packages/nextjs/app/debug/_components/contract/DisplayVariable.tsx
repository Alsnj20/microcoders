"use client";

import { ArrowPathIcon } from "@heroicons/react/24/outline";
import type { Abi, AbiFunction } from "abitype";
import { useTheme } from "next-themes";
import { useEffect, useMemo } from "react";
import type { Address } from "viem";
import { useReadContract } from "wagmi";
import { useAnimationConfig } from "~~/hooks/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";
import { getParsedError, notification } from "~~/utils/scaffold-eth";
import { InheritanceTooltip } from "./InheritanceTooltip";
import { displayTxResult } from "./utilsDisplay";

type DisplayVariableProps = {
  contractAddress: Address;
  abiFunction: AbiFunction;
  refreshDisplayVariables: boolean;
  inheritedFrom?: string;
  abi: Abi;
};

export const DisplayVariable = ({
  contractAddress,
  abiFunction,
  refreshDisplayVariables,
  abi,
  inheritedFrom,
}: DisplayVariableProps) => {
  const { targetNetwork } = useTargetNetwork();
  const { resolvedTheme } = useTheme();
  const isDarkMode = useMemo(() => resolvedTheme === "dark", [resolvedTheme]);

  const {
    data: result,
    isFetching,
    refetch,
    error,
  } = useReadContract({
    address: contractAddress,
    functionName: abiFunction.name,
    abi: abi,
    chainId: targetNetwork.id,
    query: {
      retry: false,
    },
  });

  const { showAnimation } = useAnimationConfig(result);

  // biome-ignore lint/correctness/useExhaustiveDependencies(refreshDisplayVariables): trigger refetch when parent signals refresh
  useEffect(() => {
    refetch();
  }, [refetch, refreshDisplayVariables]);

  useEffect(() => {
    if (error) {
      const parsedError = getParsedError(error);
      notification.error(parsedError);
    }
  }, [error]);

  return (
    <div className="space-y-1 pb-2" data-testid={`display-variable-${abiFunction.name}`}>
      <div className="flex items-center">
        <h3
          className="font-medium text-lg mb-0 break-all"
          style={{
            color: isDarkMode ? "#30B4ED" : "#30B4ED",
          }}
        >
          {abiFunction.name}
        </h3>
        <button
          type="button"
          className="hover:bg-muted h-6 px-2 text-xs cursor-pointer"
          onClick={async () => await refetch()}
        >
          {isFetching ? (
            <span className="animate-spin border-2 border-current border-t-transparent rounded-full h-3 w-3" />
          ) : (
            <ArrowPathIcon className="h-3 w-3 cursor-pointer" aria-hidden="true" />
          )}
        </button>
        <InheritanceTooltip inheritedFrom={inheritedFrom} />
      </div>
      <div className="font-medium flex flex-col items-start">
        <div>
          <div
            className={`break-all block transition bg-transparent ${
              showAnimation ? "bg-warning rounded-sm animate-pulse-fast" : ""
            }`}
            style={{
              color: isDarkMode ? "white" : "black",
            }}
            data-testid="display-variable-value"
          >
            {displayTxResult(result)}
          </div>
        </div>
      </div>
    </div>
  );
};
