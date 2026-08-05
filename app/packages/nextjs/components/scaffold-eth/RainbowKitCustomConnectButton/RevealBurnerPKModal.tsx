import { ShieldExclamationIcon } from "@heroicons/react/24/outline";
import { rainbowkitBurnerWallet } from "burner-connector";
import { useCopyToClipboard } from "~~/hooks/scaffold-eth";
import { getParsedError, notification } from "~~/utils/scaffold-eth";

const BURNER_WALLET_PK_KEY = "burnerWallet.pk";

type RevealBurnerPKModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export const RevealBurnerPKModal = ({ isOpen, onClose }: RevealBurnerPKModalProps) => {
  const { copyToClipboard, isCopiedToClipboard } = useCopyToClipboard();

  const handleCopyPK = async () => {
    try {
      const storage = rainbowkitBurnerWallet.useSessionStorage ? sessionStorage : localStorage;
      const burnerPK = storage?.getItem(BURNER_WALLET_PK_KEY);
      if (!burnerPK) throw new Error("Burner wallet private key not found");
      await copyToClipboard(burnerPK);
      notification.success("Burner wallet private key copied to clipboard");
    } catch (e) {
      const parsedError = getParsedError(e);
      notification.error(parsedError);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-card rounded-xl p-6 shadow-xl max-w-md w-full" onClick={e => e.stopPropagation()}>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-lg font-medium transition-colors h-8 px-3 text-xs hover:bg-muted absolute right-3 top-3"
          onClick={onClose}
        >
          ✕
        </button>
        <div>
          <p className="text-lg font-semibold m-0 p-0">Copy Burner Wallet Private Key</p>
          <div role="alert" className="rounded-lg p-4 bg-warning/20 text-foreground mt-4">
            <ShieldExclamationIcon className="h-6 w-6" />
            <span className="font-semibold">
              Burner wallets are intended for local development only and are not safe for storing real funds.
            </span>
          </div>
          <p>
            Your Private Key provides <strong>full access</strong> to your entire wallet and funds. This is
            currently stored <strong>temporarily</strong> in your browser.
          </p>
          <button
            type="button"
            className="border border-border bg-transparent hover:bg-muted inline-flex items-center justify-center rounded-lg font-medium transition-colors px-4 py-2 border-destructive"
            onClick={handleCopyPK}
            disabled={isCopiedToClipboard}
          >
            Copy Private Key To Clipboard
          </button>
        </div>
      </div>
    </div>
  );
};
