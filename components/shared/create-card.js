export function CreateCard({ as: Component = "button", tone = "primary", icon, title, description, className = "", children, ...props }) {
  return (
    <Component className={`workspace-create-card workspace-create-card-${tone} ${className}`.trim()} {...props}>
      <span className="workspace-create-card-icon display-face">{icon}</span>
      <span>
        <span className="workspace-create-card-title display-face">{title}</span>
        <span className="workspace-create-card-copy ui-copy">{description}</span>
      </span>
      {children}
    </Component>
  );
}
