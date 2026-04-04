const FooterSection = () => {
  return (
    <footer className="border-t border-slate-800 py-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-4 px-6 text-sm text-slate-400 md:flex-row">
        <p>© {new Date().getFullYear()} Syncho Stock</p>
        <div className="flex items-center gap-6">
          <a href="#" className="hover:text-slate-200">Termos</a>
          <a href="#" className="hover:text-slate-200">Privacidade</a>
          <a href="mailto:contato@syncho.cloud" className="hover:text-slate-200">contato@syncho.cloud</a>
        </div>
      </div>
    </footer>
  );
};

export default FooterSection;
