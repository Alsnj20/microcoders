import { ArrowLeftEndOnRectangleIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { useRef, useState } from "react";
import { useDisconnect } from "wagmi";
import { useOutsideClick } from "~~/hooks/scaffold-eth";
import { NetworkOptions } from "./NetworkOptions";

export const WrongNetworkDropdown = () => {
  const { disconnect } = useDisconnect();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useOutsideClick(dropdownRef, () => setIsOpen(false));

  return (
    <div ref={dropdownRef} className="relative inline-block mr-2">
      <button
        className="bg-destructive text-white inline-flex items-center justify-center rounded-lg font-medium transition-colors h-8 px-3 text-xs gap-1"
        onClick={() => setIsOpen(prev => !prev)}
        type="button"
      >
        <span>Wrong network</span>
        <ChevronDownIcon className="h-6 w-4 ml-2 sm:ml-0" />
      </button>
      {isOpen && (
        <ul className="absolute right-0 mt-1 bg-card rounded-lg shadow-lg border border-border z-50 min-w-[200px] py-2">
          <NetworkOptions />
          <li>
            <button
              className="px-4 py-2 hover:bg-muted cursor-pointer text-destructive h-8 px-3 text-xs rounded-xl! flex gap-3 py-3"
              type="button"
              onClick={() => disconnect()}
            >
              <ArrowLeftEndOnRectangleIcon className="h-6 w-4 ml-2 sm:ml-0" />
              <span>Disconnect</span>
            </button>
          </li>
        </ul>
      )}
    </div>
  );
};
