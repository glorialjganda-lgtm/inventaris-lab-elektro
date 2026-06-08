const Card = ({ title, children, className = "" }) => (
  <section className={`card ${className}`}>
    {title ? <h2 className="card-title">{title}</h2> : null}
    {children}
  </section>
);

export default Card;
