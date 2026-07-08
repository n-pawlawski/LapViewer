type AppLogoProps = {
  size?: number;
  className?: string;
};

export function AppLogo({ size = 28, className }: AppLogoProps) {
  return (
    <img
      src="/favicon.png"
      alt=""
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    />
  );
}
