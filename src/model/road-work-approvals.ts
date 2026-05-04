/**
 * @author Simon Meyer (GEOBOX AG)
 * @copyright Copyright (c) Stadt Winterthur. All rights reserved.
 */

export class RoadWorkApprovals {
    uuid: string = "";
    approvalRequired?: boolean = false;
    strgApprovalRequired?: boolean = false;
    bafuApprovalRequired?: boolean = false;
    lsvApprovalRequired?: boolean = false;
    ssvApprovalRequired?: boolean = false;
    wwgApprovalRequired?: boolean = false;
    eriApprovalRequired?: boolean = false;
    pbgApprovalRequired?: boolean = false;
    ebgApprovalRequired?: boolean = false;
    awelApprovalRequired?: boolean = false;
    estiApprovalRequired?: boolean = false;
    otherApprovalRequired?: boolean = false;
    otherApprovalDetails: string = "";
}