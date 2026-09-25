import React from 'react';
import { Link } from 'react-router-dom';
import { ScanFace, ArrowLeft } from 'lucide-react';

export const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center bg-slate-950">
      <div className="space-y-4 max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center mx-auto border border-teal-500/20">
          <ScanFace className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-extrabold text-white font-outfit">404 - Page Not Found</h1>
        <p className="text-xs text-slate-400">
          The requested classroom or portal route does not exist.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Portal
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
