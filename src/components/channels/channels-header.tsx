import { cn } from "@/lib/utils";

type ChannelsHeaderProps = {
  title: string;
  onAdd?: () => void;
  className?: string;
  addAriaLabel?: string;
};

export function ChannelsHeader({ title, onAdd, className, addAriaLabel = "Add channels" }: ChannelsHeaderProps) {
  return (
    <div className={cn("channels-header", className)}>
      <h1>{title}</h1>
      {onAdd && (
        <button type="button" className="channels-add" onClick={onAdd} aria-label={addAriaLabel}>
          <i className="fa-solid fa-plus" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
