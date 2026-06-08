import EmptyState from "../common/EmptyState.jsx";
import Loading from "../common/Loading.jsx";

const DataTable = ({ columns = [], data = [], loading = false, emptyTitle, emptyMessage, actions }) => {
  if (loading) return <Loading />;

  if (!data.length) {
    return (
      <EmptyState
        title={emptyTitle || "Belum ada data"}
        description={emptyMessage || "Data akan tampil di sini setelah tersedia."}
      />
    );
  }

  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
            {actions ? <th>Aksi</th> : null}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr key={row.id || rowIndex}>
              {columns.map((column) => (
                <td key={column.key}>
                  {column.render ? column.render(row, rowIndex) : row[column.key]}
                </td>
              ))}
              {actions ? <td>{actions(row, rowIndex)}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
