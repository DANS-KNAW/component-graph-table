import { Client } from "pg";
import {
  workflowJoin,
  resourceRightsJoin,
  relationTypeJoin,
  keywordsJoin,
  individualJoin,
  institutionsJoin,
  interestGroupsJoin,
  pathwaysJoin,
  workingGroupsJoin,
} from "./joins";

/**
 * Creates the `view_resource` while also importing the necessery joins.
 * @param client - The database client.
 */
const createQueryView = async (client: Client) => {
  await client.query(`
        CREATE VIEW view_resource AS
        SELECT * FROM resource
        ${workflowJoin}
        ${resourceRightsJoin}
        ${relationTypeJoin}
        ${keywordsJoin}
        ${individualJoin}
        ${institutionsJoin}
        ${pathwaysJoin}
        ${workingGroupsJoin}
        ${interestGroupsJoin}
    ;`);
};

export default createQueryView;
