import { FiSidebar } from "react-icons/fi";

type SidebarToggleProps = {
	onClick: React.MouseEventHandler<HTMLButtonElement>;
	selected?: boolean;
};

function SidebarToggle(props: SidebarToggleProps) {
	return (
		<button type="button" onClick={props.onClick} data-selected={props.selected}>
			<FiSidebar />
		</button>
	);
}

export default SidebarToggle;