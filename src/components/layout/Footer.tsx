import { Github, Mail, Shield } from 'lucide-react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-200 mt-12">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Shield className="text-blue-600" size={20} />
              <h3 className="font-semibold text-gray-900">Quality Assurance</h3>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Professional quality control monitoring system for laboratory measurements.
              Ensuring accuracy and compliance with industry standards.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Features</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Real-time QC monitoring</li>
              <li>• Westgard rules validation</li>
              <li>• Statistical analysis</li>
              <li>• Data export capabilities</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Contact</h3>
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <Mail size={16} />
              <span>support@qcdashboard.com</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Github size={16} />
              <span>Documentation</span>
            </div>
          </div>
        </div>
        
        <div className="pt-6 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-500">
            © {currentYear} Quality Control Dashboard. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-gray-500">
            <a href="#" className="hover:text-gray-900 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-gray-900 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-gray-900 transition-colors">Help</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
