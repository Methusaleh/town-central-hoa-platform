export const GUIDELINES = [
  {
    title: "Be kind",
    body: "Treat neighbors the way you would on the street.",
  },
  {
    title: "Keep it constructive",
    body: "Safety, events, and neighborhood news belong here. A personal complaint goes to The Board, not a public thread.",
  },
  {
    title: "No explicit or violent media",
    body: "Photos and GIFs are watched. Off-limits posts come down, and the account can be reviewed.",
  },
  {
    title: "The board can take a post down",
    body: "If something breaks these rules, they can remove it.",
  },
];

export function GuidelinesList({ className }) {
  return (
    <ol className={className}>
      {GUIDELINES.map((item) => (
        <li key={item.title}>
          <strong>{item.title}.</strong> {item.body}
        </li>
      ))}
    </ol>
  );
}
