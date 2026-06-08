const Badge = ({ children, variant = "neutral" }) => {
  return <span className={`badge ${variant}`}>{children}</span>;
};

export default Badge;
