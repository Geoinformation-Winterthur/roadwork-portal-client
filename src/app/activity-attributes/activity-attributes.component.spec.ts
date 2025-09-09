import { ActivityAttributesComponent } from './activity-attributes.component';
import { of } from 'rxjs';

// ---- simple Mocks NUR für den Konstruktor ----
const activatedRouteMock = { params: of({ id: 'new' }), queryParams: of({}) };

const roadWorkActivityServiceMock = {
  getProjectTypes: () => of([]),
  getRoadWorkActivities: () => of([]),
  addRoadworkActivity: () => of({ errorMessage: '' }),
  updateRoadWorkActivity: () => of({ errorMessage: '' }),
  registerTrafficManager: () => of({ errorMessage: '' }),
  deleteRoadWorkActivity: () => of({ errorMessage: '' }),
};

const needsOfActivityServiceMock = {
  assignedRoadWorkNeeds: [],
  nonAssignedRoadWorkNeeds: [],
  registeredRoadWorkNeeds: [],
  assignedRoadWorkNeedsWithDocuments: [],
  updateIntersectingRoadWorkNeeds: (_: string) => {},
};

const managementAreaServiceMock = { getIntersectingManagementArea: () => of(null) };

const roadWorkNeedServiceMock = {
  getRoadWorkNeeds: () => of([]),
  updateRoadWorkNeed: () => of({ errorMessage: '' }),
  deleteRoadWorkNeed: () => of({ errorMessage: '' }),
};

const userServiceMock = {
  getAllUsers: () => of([]),
  getUserFromDB: (_: string) => of([{ errorMessage: '' }]),
  getLocalUser: () => ({ mailAddress: 'test@example.com', chosenRole: 'administrator' }),
};

const organisationServiceMock = { getAllOrgTypes: () => of([{ errorMessage: '' }]) };
const appConfigServiceMock = { getConfigurationData: () => of({ errorMessage: '' }) };
const consultationServiceMock = {};
const routerMock = { navigate: (_: any[]) => {} };
const snackBarMock = { open: (_: string) => {} };
const documentServiceMock = {
  uploadDocument: () => of({ errorMessage: '' }),
  getDocument: () => of(new Blob()),
  deleteDocument: () => of({}),
};
const dialogMock = { open: (_: any, __?: any) => {} };

describe('ActivityAttributesComponent (class only)', () => {
  it('should create', () => {
    const cmp = new ActivityAttributesComponent(
      activatedRouteMock as any,
      roadWorkActivityServiceMock as any,
      needsOfActivityServiceMock as any,
      managementAreaServiceMock as any,
      roadWorkNeedServiceMock as any,
      userServiceMock as any,
      organisationServiceMock as any,
      appConfigServiceMock as any,
      consultationServiceMock as any,
      routerMock as any,
      snackBarMock as any,
      documentServiceMock as any,
      dialogMock as any
    );
    expect(cmp).toBeTruthy();
  });
});
