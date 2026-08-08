import { Routes } from '@angular/router';

export const CAREERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/careers-page/careers-page').then((m) => m.CareersPageComponent),
    title: 'Careers — LoanEx',
  },
  {
    path: 'general-application',
    loadComponent: () =>
      import('./pages/general-application/general-application').then(
        (m) => m.GeneralApplicationComponent,
      ),
    title: 'Submit Your Resume — LoanEx Careers',
  },
  {
    path: ':jobSlug/apply',
    loadComponent: () =>
      import('./pages/job-apply/job-apply').then((m) => m.JobApplyComponent),
    title: 'Apply — LoanEx Careers',
  },
  {
    path: ':jobSlug',
    loadComponent: () =>
      import('./pages/job-details/job-details').then((m) => m.JobDetailsComponent),
    title: 'Job Details — LoanEx Careers',
  },
];
