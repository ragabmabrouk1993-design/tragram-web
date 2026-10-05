import { Tag } from "@/components/dashboard/tag";

type AccountMetaChipsProps = {
  chips: string[];
};

export function AccountMetaChips({ chips }: AccountMetaChipsProps) {
  return (
    <div className="dashboard-chip-row">
      {chips.map((chip, index) => (
        <Tag key={`${chip}-${index}`} tone={index === 0 ? "accent" : "muted"}>
          {chip}
        </Tag>
      ))}
    </div>
  );
}
