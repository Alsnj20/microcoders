import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import { replacer } from "~~/utils/scaffold-eth/common";
import type { AbiParameterTuple } from "~~/utils/scaffold-eth/contract";
import { ContractInput } from "./ContractInput";
import { getFunctionInputKey, getInitialTupleFormState } from "./utilsContract";

type TupleProps = {
  abiTupleParameter: AbiParameterTuple;
  // biome-ignore lint/suspicious/noExplicitAny: dynamic ABI form state
  setParentForm: Dispatch<SetStateAction<Record<string, any>>>;
  parentStateObjectKey: string;
  // biome-ignore lint/suspicious/noExplicitAny: dynamic ABI form state
  parentForm: Record<string, any> | undefined;
};

export const Tuple = ({ abiTupleParameter, setParentForm, parentStateObjectKey }: TupleProps) => {
  // biome-ignore lint/suspicious/noExplicitAny: dynamic ABI form state
  const [form, setForm] = useState<Record<string, any>>(() => getInitialTupleFormState(abiTupleParameter));

  // biome-ignore lint/correctness/useExhaustiveDependencies: custom tuple form serialization trigger
  useEffect(() => {
    const values = Object.values(form);
    // biome-ignore lint/suspicious/noExplicitAny: dynamic ABI form state
    const argsStruct: Record<string, any> = {};
    abiTupleParameter.components.forEach((component, componentIndex) => {
      argsStruct[component.name || `input_${componentIndex}_`] = values[componentIndex];
    });

    setParentForm(parentForm => ({ ...parentForm, [parentStateObjectKey]: JSON.stringify(argsStruct, replacer) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(form, replacer)]);

  return (
    <div>
      <details className="bg-muted pl-4 py-1.5 border-2 border-secondary rounded-lg">
        <summary className="p-0 min-h-fit cursor-pointer text-primary-foreground/50 list-none flex items-center">
          <svg
            className="w-4 h-4 mr-2 transition-transform details-open:rotate-90"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
            role="img"
            aria-label="Expand"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
          <p className="m-0 p-0 text-[1rem]">{abiTupleParameter.internalType}</p>
        </summary>
        <div className="ml-3 flex-col space-y-4 border-secondary/80 border-l-2 pl-4 pt-2 pb-2">
          {abiTupleParameter?.components?.map((param, index) => {
            const key = getFunctionInputKey(abiTupleParameter.name || "tuple", param, index);
            return <ContractInput setForm={setForm} form={form} key={key} stateObjectKey={key} paramType={param} />;
          })}
        </div>
      </details>
    </div>
  );
};
