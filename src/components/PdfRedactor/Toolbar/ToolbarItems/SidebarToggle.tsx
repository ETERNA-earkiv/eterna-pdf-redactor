import { FiSidebar } from "react-icons/fi";

type SidebarToggleProps = {
	onClick: React.MouseEventHandler<HTMLButtonElement>;
};

function SidebarToggle(props: SidebarToggleProps) {
	return (
		<button type="button" onClick={props.onClick}>
			<FiSidebar />
		</button>
	);
}

export default SidebarToggle;