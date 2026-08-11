import Image from "next/image";
import { SIGNS, type SignKey } from "../../constants/signs";

interface SignProps {
  name: SignKey;
  size?: number;
  className?: string;
}

export const Sign = ({ name, size = 64, className }: SignProps) => {
  const sign = SIGNS[name];
  return <Image src={sign.src} alt={sign.alt} width={size} height={size} className={className} />;
};
