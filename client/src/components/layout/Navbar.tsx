import { HelpCircle, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-2.5 fixed w-full z-20 top-0 left-0 shadow-sm">
      <div className="flex flex-wrap justify-between items-center">
        <div className="flex items-center">
          <a href="/" className="flex items-center">
            <svg className="h-8 w-8 text-primary" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              <path d="M12 3v14m-3-7h6" />
            </svg>
            <span className="self-center text-xl font-semibold whitespace-nowrap ml-2">FHIRSpective</span>
          </a>
          <div className="hidden md:flex items-center ml-8">
            <span className="text-sm font-light text-gray-500">FHIR Data Quality Assessor</span>
          </div>
        </div>
        <div className="flex items-center">
          <Button variant="ghost" size="icon" className="text-gray-700 hover:text-primary mr-1">
            <HelpCircle className="h-6 w-6" />
          </Button>
          <Button variant="ghost" size="icon" className="text-gray-700 hover:text-primary">
            <Settings className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </nav>
  );
}
