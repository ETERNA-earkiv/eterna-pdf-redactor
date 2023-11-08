type PageSelectorProps = {
	onChange: React.ChangeEventHandler<HTMLInputElement>;
    pageNumber? : number;
    numPages?: number;
};

function PageSelector(props: PageSelectorProps) {
	return (
		<>
			<input
				type="text"
				value={props.pageNumber || 0}
				inputMode="numeric"
				pattern="d*"
				onChange={props.onChange}
			/>
			<span>av {props.numPages}</span>
		</>
	);
}

export default PageSelector;
