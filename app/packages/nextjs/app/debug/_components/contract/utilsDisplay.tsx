import { ArrowsRightLeftIcon } from "@heroicons/react/24/solid";
import { type ReactElement, useState } from "react";
import { type TransactionBase, type TransactionReceipt, formatEther, isAddress, isHex } from "viem";
import { Address } from "~~/components/scaffold-eth";
import { replacer } from "~~/utils/scaffold-eth/common";

type DisplayContent =
  | string
  | number
  | bigint
  // biome-ignore lint/suspicious/noExplicitAny: dynamic ABI display content
  | Record<string, any>
  | TransactionBase
  | TransactionReceipt
  | undefined
  | unknown;

type ResultFontSize = "sm" | "base" | "xs" | "lg" | "xl" | "2xl" | "3xl";

export const displayTxResult = (
  displayContent: DisplayContent | DisplayContent[],
  fontSize: ResultFontSize = "base",
): string | ReactElement | number => {
  if (displayContent == null) {
    return "";
  }

  if (typeof displayContent === "bigint") {
    return <NumberDisplay value={displayContent} />;
  }

  if (typeof displayContent === "string") {
    if (isAddress(displayContent)) {
      return <Address address={displayContent} size={fontSize} onlyEnsOrAddress />;
    }

    if (isHex(displayContent)) {
      return displayContent; // don't add quotes
    }
  }

  if (Array.isArray(displayContent)) {
    return <ArrayDisplay values={displayContent} size={fontSize} />;
  }

  if (typeof displayContent === "object") {
    return <StructDisplay struct={displayContent} size={fontSize} />;
  }

  return JSON.stringify(displayContent, replacer, 2);
};

const NumberDisplay = ({ value }: { value: bigint }) => {
  const [isEther, setIsEther] = useState(false);

  const asNumber = Number(value);
  if (asNumber <= Number.MAX_SAFE_INTEGER && asNumber >= Number.MIN_SAFE_INTEGER) {
    return String(value);
  }

  return (
    <div className="flex items-baseline">
      {isEther ? `Ξ${formatEther(value)}` : String(value)}
      <span
        className="group relative font-sans ml-2"
        data-tip={isEther ? "Multiply by 1e18" : "Divide by 1e18"}
      >
        <button type="button" className="hover:bg-muted rounded-full h-6 px-2 text-xs cursor-pointer" onClick={() => setIsEther(!isEther)}>
          <ArrowsRightLeftIcon className="h-3 w-3 opacity-65" />
        </button>
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-primary-foreground bg-primary rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          {isEther ? "Multiply by 1e18" : "Divide by 1e18"}
        </span>
      </span>
    </div>
  );
};

export const ObjectFieldDisplay = ({
  name,
  value,
  size,
  leftPad = true,
}: {
  name: string;
  value: DisplayContent;
  size: ResultFontSize;
  leftPad?: boolean;
}) => {
  return (
    <div className={`flex flex-row items-baseline ${leftPad ? "ml-4" : ""}`}>
      <span className="text-foreground/60 mr-2">{name}:</span>
      <span className="text-foreground">{displayTxResult(value, size)}</span>
    </div>
  );
};

const ArrayDisplay = ({ values, size }: { values: DisplayContent[]; size: ResultFontSize }) => {
  return (
    <div className="flex flex-col gap-y-1">
      {values.length ? "array" : "[]"}
      {values.map((v, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: array index is stable for display-only list
        <ObjectFieldDisplay key={i} name={`[${i}]`} value={v} size={size} />
      ))}
    </div>
  );
};

// biome-ignore lint/suspicious/noExplicitAny: dynamic ABI struct fields
const StructDisplay = ({ struct, size }: { struct: Record<string, any>; size: ResultFontSize }) => {
  return (
    <div className="flex flex-col gap-y-1">
      struct
      {Object.entries(struct).map(([k, v]) => (
        <ObjectFieldDisplay key={k} name={k} value={v} size={size} />
      ))}
    </div>
  );
};
