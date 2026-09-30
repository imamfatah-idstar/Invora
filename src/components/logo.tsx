// Logo resmi IDStar (dari Google Drive Kalla, folder "IDstar Logo").
// Rasio asli file: 2354 x 973 px.
// variant "white" dipakai di atas latar gelap (topbar, login), "color" di atas latar terang.
const RASIO = 2354 / 973;

export default function Logo({
  height = 32,
  variant = "white",
}: {
  height?: number;
  variant?: "white" | "color";
}) {
  const src = variant === "white" ? "/idstar-logo-white.png" : "/idstar-logo-color.png";
  return (
    <img
      src={src}
      alt="IDStar"
      height={height}
      width={Math.round(height * RASIO)}
      style={{ height, width: "auto", display: "block" }}
    />
  );
}
