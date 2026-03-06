import { gradients, backgroundOptions } from "./avatarTypes";

export { backgroundOptions, gradients };

export default function Background({ type }: { type: string }) {
  const pair = gradients[type] ?? gradients["sky"];
  const [start, end] = pair;

  return (
    <>
      <defs>
        <linearGradient id={`grad-${type}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={start} />
          <stop offset="100%" stopColor={end} />
        </linearGradient>
      </defs>
      <rect width="120" height="120" fill={`url(#grad-${type})`} />
    </>
  );
}
