type ComingSoonCardProps = {
  title: string;
};

export function ComingSoonCard({ title }: ComingSoonCardProps) {
  return (
    <div className="rounded-xl mt-4 border border-dashed p-6 text-sm text-muted-foreground">
      {title} em construção.
    </div>
  );
}

