import { icons } from "./icons.jsx";

export default function Toolbar({
  query,
  onQuery,
  placeholder,
  filter,
  onFilter,
  filterLabel,
  filterOptions,
  sort,
  onSort,
  sortOptions,
  onClear,
}) {
  return (
    <div className="toolbar">
      <div className="field">
        {icons.search}
        <input
          type="search"
          value={query}
          placeholder={placeholder}
          aria-label={placeholder}
          onChange={(e) => onQuery(e.target.value)}
        />
      </div>
      <div className="field">
        <select value={filter} onChange={(e) => onFilter(e.target.value)} aria-label={filterLabel}>
          <option value="">{filterLabel}</option>
          {filterOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <select value={sort} onChange={(e) => onSort(e.target.value)} aria-label="Sort">
          {sortOptions.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <button className="clear" type="button" onClick={onClear}>
        Clear
      </button>
    </div>
  );
}
