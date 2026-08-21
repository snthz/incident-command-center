import Image from "next/image";

export function Logo({ size = 30 }: { size?: number }) {
  return (
    <span className="flex items-center gap-3">
      <Image
        src="/icons/icc-isotipo-dark.svg"
        alt=""
        width={size}
        height={size}
        priority
      />
      <span aria-hidden className="h-7 w-px bg-line" />
      <span className="flex flex-col text-[13px] leading-[1.15] text-foreground">
        <span className="font-semibold">Incident</span>
        <span className="font-light">Command Center</span>
      </span>
    </span>
  );
}
