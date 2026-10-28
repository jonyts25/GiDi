import { Test, TestingModule } from "@nestjs/testing";
import { PatientsController } from "./patients.controller";
import { PatientsService } from "./patients.service";
import { FollowUpAccessService } from "../followups/followup-access.service";
import { JwtGuard } from "../auth/jwt.guard";
import { RolesGuard } from "../auth/roles.guard";

describe("PatientsController", () => {
  let controller: PatientsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PatientsController],
      providers: [
        {
          provide: PatientsService,
          useValue: {
            create: jest.fn(),
            findOne: jest.fn(),
            findForTherapist: jest.fn(),
            findForCoordinator: jest.fn(),
            findAll: jest.fn(),
          },
        },
        {
          provide: FollowUpAccessService,
          useValue: {
            assertCanViewPatient: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PatientsController>(PatientsController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
