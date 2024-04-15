import { Client } from "pg";
import {
  workflowJoin,
  resourceRightsJoin,
  relationTypeJoin,
  keywordsJoin,
  individualJoin,
  institutionsJoin,
  pathwaysJoin,
  workingGroupsJoin,
  interestGroupsJoin,
} from "./rda";

export const rdaJoins = [
  workflowJoin,
  resourceRightsJoin,
  relationTypeJoin,
  keywordsJoin,
  individualJoin,
  institutionsJoin,
  pathwaysJoin,
  workingGroupsJoin,
  interestGroupsJoin,
];
