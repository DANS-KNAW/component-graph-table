export const workflowJoin = `
    LEFT JOIN (
    SELECT
        uuid_resource as uuid_rda, 
        json_agg(
        json_build_object(
            'uuid_workflow', workflow.uuid_workflow,
            'status', workflow.workflowstate, 
            'description', workflow.description
        )
        ) AS workflows
    FROM workflow, resource_workflow
    WHERE workflow.uuid_workflow = resource_workflow.uuid_adoptionstate
    GROUP BY resource_workflow.uuid_resource
    ) AS resource_workflow USING (uuid_rda)
`;


export const resourceRightsJoin = `
    LEFT JOIN (
    SELECT
        uuid_resource as uuid_rda,
        json_agg(
        json_build_object(
            'lod_pid', rights.lod_pid,
            'name', rights.description,
            'idOfType', rights.type,
            'status', resource_rights.status,
            'lasttouch', resource_rights.lasttouch
        )
        ) AS rights
    FROM rights, resource_rights
    WHERE rights.lod_pid = resource_rights.lod_pid
    GROUP BY resource_rights.uuid_resource
    ) AS resource_rights USING (uuid_rda)
`;

export const relationTypeJoin = `
    LEFT JOIN (
    SELECT 
        uuid_resource as uuid_rda,
        json_agg(
        json_build_object(
            'uuid_relation', relation.uuid_relation,
            'uuid_relationtype', relation.uuid_relationtype,
            'relation', relation.relation,
            'lod_pid', resource_relation.lod_pid,
            'relation_type', relation.relation_type,
            'shortdescription', relation.shortdescription,
            'description', relation.description
        )
        ) AS relations
    FROM relation, resource_relation
    WHERE relation.uuid_relationtype = resource_relation.uuid_relationtype
    GROUP BY resource_relation.uuid_resource
    ) AS resource_relation USING (uuid_rda)
`;

export const keywordsJoin = `
    LEFT JOIN (
    SELECT
        uuid_resource as uuid_rda,
        array_agg(DISTINCT subject_resource.keyword) AS keywords
    FROM subject_resource
    GROUP BY subject_resource.uuid_resource
    ) AS keywords USING (uuid_rda)
`;

export const individualJoin = `
    LEFT JOIN (
    SELECT
        uuid_resource as uuid_rda,
        json_agg(
        json_build_object(
            'uuid_individual', individual.uuid_individual,
            'fullname', individual.fullname,
            'country', individual.country,
            'isAssociatedWith', (
            SELECT array_agg(DISTINCT institutions.english_name)
            FROM institutions
            JOIN individual_institution ON institutions.uuid_institution = individual_institution.uuid_institution
            WHERE individual_institution.uuid_rda_member = individual.uuid_individual
            ),
            'isMemberOf', (
            SELECT (
                SELECT
                array_agg(DISTINCT individual_member.institution)
                FROM individual_member
                WHERE individual.uuid_individual = individual_member.uuid_individual
            ) || (
                SELECT
                array_agg(DISTINCT individual_groupall.group)
                FROM individual_groupall
                WHERE individual.uuid_individual = individual_groupall.uuid_individual
            ) AS member_of
            ),
            'isCoChair', (
            SELECT
                array_agg(DISTINCT individual_group.group_title)
            FROM individual_group
            WHERE individual.uuid_individual = individual_group.uuid_individual
            )
        )
        ) AS isContributor
    FROM individual_resource, individual
    WHERE individual_resource.uuid_individual = individual.uuid_individual
    GROUP BY individual_resource.uuid_resource
    ) AS isContributor USING (uuid_rda)
`;

export const institutionsJoin = `
    LEFT JOIN (
    SELECT
        individual_resource.uuid_resource as uuid_rda,
        json_agg(
        DISTINCT jsonb_build_object(
            'uuid_institution', institutions.uuid_institution,
            'institution', institutions.english_name,
            'parent_institution' , institutions.parent_institution,
            'basedIn', institution_country.country,
            'isType', orgtype.organisationtype,
            'provides', institution_roles.institutionrole
        )
        ) AS institutions
    FROM individual_resource
    LEFT JOIN individual_institution ON individual_resource.uuid_individual = individual_institution.uuid_rda_member
    LEFT JOIN institutions ON institutions.uuid_institution = individual_institution.uuid_institution
    LEFT JOIN institution_country ON institutions.uuid_institution = institution_country.uuid_institution
    LEFT JOIN institution_organisationtype ON  institutions.uuid_institution = institution_organisationtype.uuid_institution
    LEFT JOIN orgtype ON institution_organisationtype.uuid_orgtype = orgtype.organisationtypeid
    LEFT JOIN institution_institutionrole ON institutions.uuid_institution = institution_institutionrole.uuid_institution
    LEFT JOIN institution_roles ON institution_institutionrole.institutionroleid = institution_roles.institutionroleid
    GROUP BY individual_resource.uuid_resource
    ) AS institutions USING (uuid_rda)
`;

export const pathwaysJoin = `
    LEFT JOIN (
    SELECT
    uuid_resource as uuid_rda,
    json_agg(
        json_build_object(
        'uuid_pathway', pathway.uuid_pathway,
        'pathway', pathway.pathway,
        'description', pathway.description,
        'source', pathway.source
        )
    ) AS pathways
    FROM resource_pathway, pathway
    WHERE resource_pathway.uuid_pathway = pathway.uuid_pathway
    GROUP BY resource_pathway.uuid_resource
    ) AS pathways USING (uuid_rda)
`;

export const workingGroupsJoin = `
    LEFT JOIN (
    SELECT
        uuid_resource as uuid_rda,
        json_agg(
        json_build_object(
            'title', workinggroup.title,
            'description', workinggroup.description,
            'domain', workinggroup.domains,
            'url', workinggroup.url
        )
        ) as workingGroups
    FROM group_resource, workinggroup
    WHERE group_resource.uuid_group = workinggroup.uuid_workinggroup
    GROUP BY group_resource.uuid_resource
    ) AS workinggroup USING (uuid_rda)
`;

export const interestGroupsJoin = `
    LEFT JOIN (
    SELECT
        uuid_resource as uuid_rda,
        json_agg(
        json_build_object(
            'title', interestgroup.title,
            'description', interestgroup.description,
            'domain', interestgroup.domains,
            'url', interestgroup.url
        )
        ) AS interestGroups
    FROM group_resource, interestgroup
    WHERE group_resource.uuid_group = interestgroup.uuid_interestgroup
    GROUP BY group_resource.uuid_resource
    ) AS interestgroup USING (uuid_rda)
`;