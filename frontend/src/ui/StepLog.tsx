interface StepLogProps {
  lines: string[];
}

export function StepLog({ lines }: StepLogProps) {
  if (lines.length === 0) return null;
  return (
    <pre className="steplog" aria-live="polite">
      {lines.map((line, i) => (
        <div key={i}>{line}</div>
      ))}
    </pre>
  );
}
