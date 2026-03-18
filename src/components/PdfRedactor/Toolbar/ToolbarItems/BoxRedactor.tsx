import BoxRedactorIcon from "../../../../assets/box-redactor.svg";

type BoxRedactorProps = {
	onClick: React.MouseEventHandler<HTMLButtonElement>;
	selected?: boolean;
};

function BoxRedactor(props: BoxRedactorProps) {
	const imgSrc = new URL(BoxRedactorIcon, import.meta.url).href;

	return (
		<button
			type="button"
			onClick={props.onClick}
			data-selected={props.selected}
			title="Maskera område"
		>
			<img src={imgSrc} alt="Redactor tool" height="24" />
		</button>
	);
}

export default BoxRedactor;
