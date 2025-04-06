export default function Footer() {
  return (
    <footer className="bg-white shadow-inner mt-8 py-4">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="text-gray-500 text-sm mb-4 md:mb-0">
            &copy; {new Date().getFullYear()} FHIRSpective. FHIR® is the registered trademark of HL7.
          </div>
          <div className="flex space-x-4 text-sm text-gray-500">
            <a href="#" className="hover:text-primary">Documentation</a>
            <a href="#" className="hover:text-primary">About</a>
            <a href="#" className="hover:text-primary">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
