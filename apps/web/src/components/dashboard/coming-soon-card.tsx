type ComingSoonCardProps = {
  title: string;
};

export function ComingSoonCard({ title }: ComingSoonCardProps) {
  return (
    <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
      {title} em construcao.
    </div>
  );
}
