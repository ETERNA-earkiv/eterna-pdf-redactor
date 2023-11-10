import styles from "./ToolbarItems.module.css";

type ApplyRedactionsProps = {
	onClick: React.MouseEventHandler<HTMLButtonElement>;
	disabled?: boolean;
};

function ApplyRedactions(props: ApplyRedactionsProps) {
	return (
		<div className={styles.ApplyRedactionsContainer}>
			<button
				type="button"
				onClick={props.onClick}
				disabled={props.disabled}
				className={styles.ApplyRedactions}
			>
				<span>Applicera</span>
			</button>
		</div>
	);
}

export default ApplyRedactions;
