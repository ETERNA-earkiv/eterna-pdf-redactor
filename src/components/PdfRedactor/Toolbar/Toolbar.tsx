import type { ReactElement } from "react";
import { IconContext } from "react-icons";

import type * as ToolbarItems from "./ToolbarItems";
import styles from "./Toolbar.module.css";

type ToolbarItemsType = typeof ToolbarItems;
type ToolbarItemsUnion = {
	[K in keyof ToolbarItemsType]: ToolbarItemsType[K];
}[keyof ToolbarItemsType];

type ToolbarItemProps = React.ComponentProps<ToolbarItemsUnion>;

// Can't restrict child types, see: https://github.com/microsoft/TypeScript/issues/21699
type ToolbarProps = {
	children: ReactElement<ToolbarItemProps> | ReactElement<ToolbarItemProps>[];
	className: string | undefined;
	iconSize: string | undefined;
};

const Toolbar: React.FC<ToolbarProps> = ({ children, className, iconSize }) => {
	return (
		<div className={className}>
			<IconContext.Provider value={{ className: styles.icon, size: iconSize }}>
				{children}
			</IconContext.Provider>
		</div>
	);
};

export default Toolbar;
