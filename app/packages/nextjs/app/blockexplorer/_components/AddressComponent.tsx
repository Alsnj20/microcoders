import type { Address as AddressType } from "viem";
import { Address, Balance } from "~~/components/scaffold-eth";
import { BackButton } from "./BackButton";
import { ContractTabs } from "./ContractTabs";

export const AddressComponent = ({
  address,
  contractData,
}: {
  address: AddressType;
  contractData: { bytecode: string; assembly: string } | null;
}) => {
  return (
    <div className="m-10 mb-20">
      <div className="flex justify-start mb-5">
        <BackButton />
      </div>
      <div className="col-span-5 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
        <div className="col-span-1 flex flex-col">
          <div className="bg-background border border-input shadow-[0_0_12px_-2px_var(--color-secondary)] rounded-3xl px-6 lg:px-8 mb-6 space-y-1 py-4 overflow-x-auto">
            <div className="flex">
              <div className="flex flex-col gap-1">
                <Address address={address} format="long" onlyEnsOrAddress />
                <div className="flex gap-1 items-center">
                  <span className="font-bold text-sm">Balance:</span>
                  <Balance address={address} className="text" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <ContractTabs address={address} contractData={contractData} />
    </div>
  );
};
