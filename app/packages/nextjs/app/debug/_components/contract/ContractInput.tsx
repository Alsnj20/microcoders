"use client";

import type { AbiParameter } from "abitype";
import type { Dispatch, SetStateAction } from "react";
import {
  AddressInput,
  Bytes32Input,
  BytesInput,
  InputBase,
  IntegerInput,
  type IntegerVariant,
} from "~~/components/scaffold-eth";
import type { AbiParameterTuple } from "~~/utils/scaffold-eth/contract";
import { Tuple } from "./Tuple";
import { TupleArray } from "./TupleArray";

type ContractInputProps = {
  // biome-ignore lint/suspicious/noExplicitAny: dynamic ABI form state
  setForm: Dispatch<SetStateAction<Record<string, any>>>;
  // biome-ignore lint/suspicious/noExplicitAny: dynamic ABI form state
  form: Record<string, any> | undefined;
  stateObjectKey: string;
  paramType: AbiParameter;
};

/**
 * Generic Input component to handle input's based on their function param type
 */
export const ContractInput = ({ setForm, form, stateObjectKey, paramType }: ContractInputProps) => {
  const inputProps = {
    name: stateObjectKey,
    value: form?.[stateObjectKey],
    placeholder: paramType.name ? `${paramType.type} ${paramType.name}` : paramType.type,
    // biome-ignore lint/suspicious/noExplicitAny: dynamic ABI input value
    onChange: (value: any) => {
      setForm(form => ({ ...form, [stateObjectKey]: value }));
    },
  };

  const renderInput = () => {
    switch (paramType.type) {
      case "address":
        return <AddressInput {...inputProps} />;
      case "bytes32":
        return <Bytes32Input {...inputProps} />;
      case "bytes":
        return <BytesInput {...inputProps} />;
      case "string":
        return <InputBase {...inputProps} />;
      case "tuple":
        return (
          <Tuple
            setParentForm={setForm}
            parentForm={form}
            abiTupleParameter={paramType as AbiParameterTuple}
            parentStateObjectKey={stateObjectKey}
          />
        );
      default:
        // Handling 'int' types and 'tuple[]' types
        if (paramType.type.includes("int") && !paramType.type.includes("[")) {
          return <IntegerInput {...inputProps} variant={paramType.type as IntegerVariant} />;
        }
        if (paramType.type.startsWith("tuple[")) {
          return (
            <TupleArray
              setParentForm={setForm}
              parentForm={form}
              abiTupleParameter={paramType as AbiParameterTuple}
              parentStateObjectKey={stateObjectKey}
            />
          );
        }
        return <InputBase {...inputProps} />;
    }
  };

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex items-center ml-2">
        {paramType.name && <span className="text-xs font-medium mr-2 leading-none param-name">{paramType.name}</span>}
        <span className="block text-xs font-extralight leading-none param-type">{paramType.type}</span>
      </div>
      <div className="input-container">{renderInput()}</div>
    </div>
  );
};
