import { QRCodeSVG } from "qrcode.react";
import type { Address as AddressType } from "viem";
import { Address } from "~~/components/scaffold-eth";

type AddressQRCodeModalProps = {
  address: AddressType;
  isOpen: boolean;
  onClose: () => void;
};

export const AddressQRCodeModal = ({ address, isOpen, onClose }: AddressQRCodeModalProps) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
      onKeyDown={e => e.key === "Escape" && onClose()}
    >
      <div
        className="bg-card rounded-xl p-6 shadow-xl max-w-md w-full"
        onClick={e => e.stopPropagation()}
        onKeyDown={e => e.stopPropagation()}
      >
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-lg font-medium transition-colors h-8 px-3 text-xs hover:bg-muted absolute right-3 top-3"
          onClick={onClose}
        >
          ✕
        </button>
        <div className="space-y-3 py-6">
          <div className="flex flex-col items-center gap-6">
            <QRCodeSVG value={address} size={256} />
            <Address address={address} format="long" disableAddressLink onlyEnsOrAddress />
          </div>
        </div>
      </div>
    </div>
  );
};
