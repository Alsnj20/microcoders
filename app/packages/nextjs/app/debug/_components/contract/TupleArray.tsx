import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import { replacer } from "~~/utils/scaffold-eth/common";
import type { AbiParameterTuple } from "~~/utils/scaffold-eth/contract";
import { ContractInput } from "./ContractInput";
import { getFunctionInputKey, getInitialTupleArrayFormState } from "./utilsContract";

type TupleArrayProps = {
  abiTupleParameter: AbiParameterTuple & { isVirtual?: true };
  // biome-ignore lint/suspicious/noExplicitAny: dynamic ABI form state
  setParentForm: Dispatch<SetStateAction<Record<string, any>>>;
  parentStateObjectKey: string;
  // biome-ignore lint/suspicious/noExplicitAny: dynamic ABI form state
  parentForm: Record<string, any> | undefined;
};

export const TupleArray = ({ abiTupleParameter, setParentForm, parentStateObjectKey }: TupleArrayProps) => {
  // biome-ignore lint/suspicious/noExplicitAny: dynamic ABI form state
  const [form, setForm] = useState<Record<string, any>>(() => getInitialTupleArrayFormState(abiTupleParameter));
  const [additionalInputs, setAdditionalInputs] = useState<Array<typeof abiTupleParameter.components>>([
    abiTupleParameter.components,
  ]);

  const depth = (abiTupleParameter.type.match(/\[\]/g) || []).length;

  // biome-ignore lint/correctness/useExhaustiveDependencies: custom tuple array form serialization trigger
  useEffect(() => {
    // Extract and group fields based on index prefix
    const groupedFields = Object.keys(form).reduce(
      (acc, key) => {
        const [indexPrefix, ...restArray] = key.split("_");
        const componentName = restArray.join("_");
        if (!acc[indexPrefix]) {
          acc[indexPrefix] = {};
        }
        acc[indexPrefix][componentName] = form[key];
        return acc;
      },
      // biome-ignore lint/suspicious/noExplicitAny: dynamic ABI form state
      {} as Record<string, Record<string, any>>,
    );

    // biome-ignore lint/suspicious/noExplicitAny: dynamic ABI form state
    let argsArray: Array<Record<string, any>> = [];

    for (const key of Object.keys(groupedFields)) {
      const currentKeyValues = Object.values(groupedFields[key]);

      // biome-ignore lint/suspicious/noExplicitAny: dynamic ABI form state
      const argsStruct: Record<string, any> = {};
      abiTupleParameter.components.forEach((component, componentIndex) => {
        argsStruct[component.name || `input_${componentIndex}_`] = currentKeyValues[componentIndex];
      });

      argsArray.push(argsStruct);
    }

    if (depth > 1) {
      argsArray = argsArray.map(args => {
        return args[abiTupleParameter.components[0].name || "tuple"];
      });
    }

    setParentForm(parentForm => {
      return { ...parentForm, [parentStateObjectKey]: JSON.stringify(argsArray, replacer) };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(form, replacer)]);

  const addInput = () => {
    setAdditionalInputs(previousValue => {
      const newAdditionalInputs = [...previousValue, abiTupleParameter.components];

      // Add the new inputs to the form
      setForm(form => {
        const newForm = { ...form };
        abiTupleParameter.components.forEach((component, componentIndex) => {
          const key = getFunctionInputKey(
            `${newAdditionalInputs.length - 1}_${abiTupleParameter.name || "tuple"}`,
            component,
            componentIndex,
          );
          newForm[key] = "";
        });
        return newForm;
      });

      return newAdditionalInputs;
    });
  };

  const removeInput = () => {
    // Remove the last inputs from the form
    setForm(form => {
      const newForm = { ...form };
      abiTupleParameter.components.forEach((component, componentIndex) => {
        const key = getFunctionInputKey(
          `${additionalInputs.length - 1}_${abiTupleParameter.name || "tuple"}`,
          component,
          componentIndex,
        );
        delete newForm[key];
      });
      return newForm;
    });
    setAdditionalInputs(inputs => inputs.slice(0, -1));
  };

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
          <p className="m-0 text-[1rem]">{abiTupleParameter.internalType}</p>
        </summary>
        <div className="ml-3 flex-col space-y-2 border-secondary/70 border-l-2 pl-4 pt-2 pb-2">
          {additionalInputs.map((additionalInput, additionalIndex) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: tuple input index
            <div key={`tuple-${additionalIndex}`} className="space-y-1">
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-input">
                {depth > 1 ? `${additionalIndex}` : `tuple[${additionalIndex}]`}
              </span>
              <div className="space-y-4">
                {additionalInput.map((param, index) => {
                  const key = getFunctionInputKey(
                    `${additionalIndex}_${abiTupleParameter.name || "tuple"}`,
                    param,
                    index,
                  );
                  return (
                    <ContractInput setForm={setForm} form={form} key={key} stateObjectKey={key} paramType={param} />
                  );
                })}
              </div>
            </div>
          ))}
          <div className="flex space-x-2">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-lg font-medium transition-colors h-8 px-3 text-xs bg-secondary text-secondary-foreground"
              onClick={addInput}
            >
              +
            </button>
            {additionalInputs.length > 0 && (
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-lg font-medium transition-colors h-8 px-3 text-xs bg-secondary text-secondary-foreground"
                onClick={removeInput}
              >
                -
              </button>
            )}
          </div>
        </div>
      </details>
    </div>
  );
};
