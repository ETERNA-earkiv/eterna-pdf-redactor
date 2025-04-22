import BoxRedactorIcon from "../../../../assets/box-redactor.svg";

type BoxRedactorProps = {
	onClick: React.MouseEventHandler<HTMLButtonElement>;
	selected?: boolean;
};

function BoxRedactor(props: BoxRedactorProps) {
	const imgSrc = new URL(
		`${import.meta.env.VITE_URL_PREFIX ?? ''}${BoxRedactorIcon}`,
		import.meta.url,
	).toString();

	return (
		<button
			type="button"
			onClick={props.onClick}
			data-selected={props.selected}
		>
			<img src={imgSrc} alt="Redactor tool" height="24" />
		</button>
	);
}

export default BoxRedactor;
