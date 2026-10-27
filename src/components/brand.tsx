import { Flower2 } from "lucide-react";
import Link from "next/link";
export function Brand({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`brand ${className}`} aria-label="UtsavOS home">
      <span className="brand-mark">
        <Flower2 size={23} />
      </span>
      <span>
        utsav<span style={{ fontStyle: "italic" }}>os</span>
      </span>
    </Link>
  );
}
