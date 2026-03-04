import { toast } from "sonner";
import { formatNumber } from '../lib/utils';
import { clsx } from "clsx";

// Empty component
export function Empty() {
  return (
    <div className={clsx("flex h-full items-center justify-center")} onClick={() => toast('Coming soon')}>Empty</div>
  );
}