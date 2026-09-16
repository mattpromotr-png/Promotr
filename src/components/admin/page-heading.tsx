export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="text-foreground mt-1.5 text-3xl font-semibold tracking-tight">
          {title}
        </h1>
        <p className="text-muted mt-1 max-w-3xl text-sm leading-5">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}
