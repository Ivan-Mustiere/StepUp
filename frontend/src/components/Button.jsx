export default function Button({ children, onClick, variant = "primary", type = "button", disabled, style }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`btn btn-${variant}`}
      style={style}
    >
      {children}
    </button>
  );
}
