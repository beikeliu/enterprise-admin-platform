export function PlaceholderPage({ title }: { title: string }) {
  return (
    <>
      <div className="page-toolbar">
        <div>
          <h1 className="page-title">{title}</h1>
          <div className="page-subtitle">模块已接入路由与权限体系，后续可按标准 CRUD 模板扩展。</div>
        </div>
      </div>
      <div className="panel">
        <div className="panel-body">这里会承载查询、表格、操作审计和导出能力。</div>
      </div>
    </>
  );
}
