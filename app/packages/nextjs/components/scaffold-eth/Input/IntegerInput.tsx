import { useTheme } from "next-themes";
import { useCallback, useEffect, useState } from "react";
import { parseEther } from "viem";
import { type CommonInputProps, InputBase, IntegerVariant, isValidInteger } from "~~/components/scaffold-eth";

type IntegerInputProps = CommonInputProps<string> & {
  variant?: IntegerVariant;
  disableMultiplyBy1e18?: boolean;
};

export const IntegerInput = ({
  value,
  onChange,
  name,
  placeholder,
  disabled,
  variant = IntegerVariant.UINT256,
  disableMultiplyBy1e18 = false,
}: IntegerInputProps) => {
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === "dark";
  const [inputError, setInputError] = useState(false);
  const multiplyBy1e18 = useCallback(() => {
    if (!value) {
      return;
    }
    return onChange(parseEther(value).toString());
  }, [onChange, value]);

  useEffect(() => {
    if (isValidInteger(variant, value)) {
      setInputError(false);
    } else {
      setInputError(true);
    }
  }, [value, variant]);

  return (
    <div
      className="integer-input-wrapper input-container"
      style={{
        padding: "12px 16px",
      }}
    >
      <InputBase
        name={name}
        value={value}
        placeholder={placeholder}
        error={inputError}
        onChange={onChange}
        disabled={disabled}
        suffix={
          !inputError &&
          !disableMultiplyBy1e18 && (
            <div className="space-x-4 flex group relative" data-tip="Multiply by 1e18 (wei)">
              <span className="absolute bottom-full right-0 mb-2 px-2 py-1 text-xs text-secondary-foreground bg-secondary rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                Multiply by 1e18 (wei)
              </span>
              <button
                className={`${disabled ? "cursor-not-allowed" : "cursor-pointer"} font-semibold px-4 text-accent`}
                onClick={multiplyBy1e18}
                disabled={disabled}
                type="button"
              >
                ∗
              </button>
            </div>
          )
        }
      />
    </div>
  );
};
